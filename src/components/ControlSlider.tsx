interface ControlSliderProps {
  label: string
  conventional: string
  value: number
  min: number
  max: number
  step: number
  format?: (value: number) => string
  prominent?: boolean
  onChange: (value: number) => void
}

export function ControlSlider({
  label,
  conventional,
  value,
  min,
  max,
  step,
  format = (current) => current.toFixed(2),
  prominent = false,
  onChange,
}: ControlSliderProps) {
  const percentage = ((value - min) / (max - min)) * 100
  return (
    <label className={`control-slider${prominent ? ' control-slider--prominent' : ''}`} title={conventional}>
      <span className="control-heading">
        <span>
          <strong>{label}</strong>
          <small>{conventional}</small>
        </span>
        <output>{format(value)}</output>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        aria-label={`${label}, ${conventional}`}
        style={{ '--range-fill': `${percentage}%` } as React.CSSProperties}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  )
}
