export interface ReservationFormData {
  sNumber: string;
  name: string;
  email: string;
  inventory: 'pc' | 'ps5' | 'switch' | '';
  date: string;
  startTime: string;
  duration: string;
  controllers: number;
  extraController: boolean;
  acceptedTerms: boolean;
}
