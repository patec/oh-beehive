'use client'

type Props = {
  name: string
  options: string[]
  value?: string | null
  onChange?: (value: string | null) => void
  label?: string
}

export function FieldSelect({ name, options, value, onChange, label }: Props) {
  return (
    <div className="space-y-2">
      {label && <p className="text-sm text-muted-foreground">{label}</p>}
      <input type="hidden" name={name} value={value ?? ''} />
      <div className="flex gap-2 flex-wrap">
        {options.map(opt => (
          <button
            key={opt}
            type="button"
            onClick={() => onChange?.(value === opt ? null : opt)}
            className={`px-3 py-1.5 rounded-md text-sm border transition-colors capitalize ${
              value === opt
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-background text-foreground border-border hover:bg-accent'
            }`}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  )
}
