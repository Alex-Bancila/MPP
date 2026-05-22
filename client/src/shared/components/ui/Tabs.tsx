interface TabOption<T extends string> {
  label: string
  value: T
}

interface TabsProps<T extends string> {
  value: T
  options: TabOption<T>[]
  onChange: (value: T) => void
}

export const Tabs = <T extends string>({ value, options, onChange }: TabsProps<T>) => {
  return (
    <div className="mc-tabs" role="tablist" aria-label="View switcher">
      {options.map((option) => {
        const active = option.value === value

        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={active}
            className={active ? 'mc-tab mc-tab--active' : 'mc-tab'}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
