export const FUEL42_ELIGIBLE_ENROLLMENT_STATUSES = ['claimed', 'onboarding_complete'] as const

export type Fuel42EligibleEnrollmentStatus = typeof FUEL42_ELIGIBLE_ENROLLMENT_STATUSES[number]

export type Fuel42EnrollmentAccessInput = {
  status: string | null | undefined
  accessExpiresAt: string | null | undefined
}

export function hasVerifiedFuel42Access(
  enrollment: Fuel42EnrollmentAccessInput | null | undefined,
  now = new Date()
) {
  if (!enrollment?.status || !enrollment.accessExpiresAt) return false
  if (!FUEL42_ELIGIBLE_ENROLLMENT_STATUSES.includes(enrollment.status as Fuel42EligibleEnrollmentStatus)) return false

  const expiresAt = new Date(enrollment.accessExpiresAt).getTime()
  return Number.isFinite(expiresAt) && expiresAt >= now.getTime()
}

