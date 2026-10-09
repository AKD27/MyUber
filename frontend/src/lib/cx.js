// Joins class names, skipping empty ones.
export const cx = (...classes) => classes.filter(Boolean).join(' ')
