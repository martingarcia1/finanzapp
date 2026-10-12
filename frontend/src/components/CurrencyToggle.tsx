import { ToggleButtonGroup, ToggleButton } from '@mui/material'
import type { Currency } from '@/types'
import { CURRENCIES } from '@/types'

interface Props {
  value: Currency
  onChange: (currency: Currency) => void
  disabled?: boolean
}

export default function CurrencyToggle({ value, onChange, disabled }: Props) {
  return (
    <ToggleButtonGroup
      value={value}
      exclusive
      size="small"
      disabled={disabled}
      onChange={(_, v) => v && onChange(v as Currency)}
    >
      {CURRENCIES.map((c) => (
        <ToggleButton key={c.value} value={c.value} sx={{ px: 2, fontWeight: 700 }}>
          {c.value}
        </ToggleButton>
      ))}
    </ToggleButtonGroup>
  )
}
