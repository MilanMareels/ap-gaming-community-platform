export type VerificationStatus = 'idle' | 'loading' | 'found' | 'not-found' | 'error';

export interface VerifiedReservation {
  cuid: string;
  email: string;
  sNumber: string;
  inventory: string;
  controllers: number;
  startTime: string;
  endTime: string;
  status: string;
}
