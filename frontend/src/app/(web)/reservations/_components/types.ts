export interface ReservationFormData {
  inventory: 'pc' | 'ps5' | 'switch' | '';
  date: string;
  startTime: string;
  duration: string;
  controllers: number;
  extraController: boolean;
  acceptedTerms: boolean;
}
