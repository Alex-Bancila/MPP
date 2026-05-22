import { Input } from '@/shared/components/ui/Input'

interface SearchInputProps {
  value: string
  onChange: (value: string) => void
}

export const SearchInput = ({ value, onChange }: SearchInputProps) => {
  const icon = (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="11" cy="11" r="8" />
      <path d="M21 21L16.65 16.65" />
    </svg>
  )

  return (
    <Input
      className="mc-search"
      label="Search listings"
      name="search"
      placeholder="Search for instruments, gear, accessories..."
      icon={icon}
      value={value}
      onChange={(event) => onChange(event.target.value)}
    />
  )
}
