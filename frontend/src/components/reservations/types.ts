import type { ReservationVerificationDto } from '@/api';

export type VerificationStatus =
  | 'idle'
  | 'loading'
  | 'found'
  | 'not-found'
  | 'error';

export type VerifiedReservation = ReservationVerificationDto;
