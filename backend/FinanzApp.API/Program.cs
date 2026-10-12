using System.Text;
using System.Text.Json;
using Fido2NetLib;
using FinanzApp.API.Data;
using FinanzApp.API.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

var builder = WebApplication.CreateBuilder(args);
var config = builder.Configuration;

// ── Secrets (user-secrets en dev, variables de entorno en prod) ───────────────
// Jwt__Key y ConnectionStrings__Default nunca van en appsettings.json.
var jwtKey = config["Jwt:Key"];
if (string.IsNullOrWhiteSpace(jwtKey) || Encoding.UTF8.GetByteCount(jwtKey) < 32)
    throw new InvalidOperationException(
        "Falta 'Jwt:Key' (mínimo 32 bytes). Configúrala con `dotnet user-secrets set \"Jwt:Key\" <valor>` " +
        "o con la variable de entorno Jwt__Key.");

if (string.IsNullOrWhiteSpace(config.GetConnectionString("Default")))
    throw new InvalidOperationException(
        "Falta 'ConnectionStrings:Default'. Configúrala con user-secrets o con ConnectionStrings__Default.");

// ── Database ──────────────────────────────────────────────────────────────────
builder.Services.AddDbContext<AppDbContext>(opt =>
    opt.UseNpgsql(config.GetConnectionString("Default")));

// ── Authentication / JWT ──────────────────────────────────────────────────────
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(opt =>
    {
        opt.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = config["Jwt:Issuer"],
            ValidAudience = config["Jwt:Audience"],
            IssuerSigningKey = new SymmetricSecurityKey(
                Encoding.UTF8.GetBytes(jwtKey)),
        };
    });

builder.Services.AddAuthorization();

// ── Application Services ──────────────────────────────────────────────────────
builder.Services.AddScoped<JwtService>();
builder.Services.AddMemoryCache();
builder.Services.AddHttpClient<ExchangeRateService>(c =>
{
    c.BaseAddress = new Uri(config["ExchangeRates:BaseUrl"] ?? "https://dolarapi.com/v1/");
    c.Timeout = TimeSpan.FromSeconds(10);
});

// ── Fido2 / WebAuthn ──────────────────────────────────────────────────────────
builder.Services.AddFido2(options =>
{
    options.ServerDomain = config["WebAuthn:RelyingPartyId"] ?? "localhost";
    options.ServerName = "FinanzApp";
    options.Origins = new HashSet<string>
    {
        config["WebAuthn:Origin"] ?? "http://localhost:5173",
    };
    options.TimestampDriftTolerance = 300000;
});

// ── CORS ──────────────────────────────────────────────────────────────────────
builder.Services.AddCors(opts =>
    opts.AddPolicy("FrontEnd", p =>
        p.WithOrigins(config["WebAuthn:Origin"] ?? "http://localhost:5173")
         .AllowAnyHeader()
         .AllowAnyMethod()
         .AllowCredentials()));

// ── Controllers / Swagger ─────────────────────────────────────────────────────
builder.Services.AddControllers()
    .AddJsonOptions(o =>
    {
        o.JsonSerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
    });

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new() { Title = "FinanzApp API", Version = "v1" });

    // Enable JWT in Swagger UI
    c.AddSecurityDefinition("Bearer", new Microsoft.OpenApi.Models.OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = Microsoft.OpenApi.Models.SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT",
        In = Microsoft.OpenApi.Models.ParameterLocation.Header,
        Description = "Introduce el token JWT (sin el prefijo 'Bearer ').",
    });
    c.AddSecurityRequirement(new Microsoft.OpenApi.Models.OpenApiSecurityRequirement
    {
        {
            new Microsoft.OpenApi.Models.OpenApiSecurityScheme
            {
                Reference = new Microsoft.OpenApi.Models.OpenApiReference
                {
                    Type = Microsoft.OpenApi.Models.ReferenceType.SecurityScheme,
                    Id = "Bearer",
                },
            },
            Array.Empty<string>()
        },
    });
});

// ─────────────────────────────────────────────────────────────────────────────
var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    using (var scope = app.Services.CreateScope())
        scope.ServiceProvider.GetRequiredService<AppDbContext>().Database.Migrate();

    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors("FrontEnd");
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

app.Run();
