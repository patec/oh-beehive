import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { FieldSelect } from '@/components/inspections/field-select'

describe('FieldSelect', () => {
  it('renders all options', () => {
    render(<FieldSelect name="brood_pattern" options={['good', 'fair', 'poor']} />)
    expect(screen.getByText('good')).toBeInTheDocument()
    expect(screen.getByText('fair')).toBeInTheDocument()
    expect(screen.getByText('poor')).toBeInTheDocument()
  })

  it('calls onChange with selected value', async () => {
    const onChange = vi.fn()
    render(<FieldSelect name="brood_pattern" options={['good', 'fair', 'poor']} onChange={onChange} />)
    await userEvent.click(screen.getByText('fair'))
    expect(onChange).toHaveBeenCalledWith('fair')
  })

  it('deselects when clicking selected option', async () => {
    const onChange = vi.fn()
    render(<FieldSelect name="brood_pattern" options={['good', 'fair', 'poor']} value="fair" onChange={onChange} />)
    await userEvent.click(screen.getByText('fair'))
    expect(onChange).toHaveBeenCalledWith(null)
  })
})
