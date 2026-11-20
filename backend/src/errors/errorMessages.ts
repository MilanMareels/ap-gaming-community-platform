export const errorMessages = {
  pastDate: 'Cannot reserve in the past',
  dayNotBookable: 'Reservations can only be made for today or the next open day',
  invalidDuration: 'A reservation must last 1, 1.5 or 2 hours',
  microsoftRequired: 'Reservations require a Microsoft account',
  minGap: (minutes: number) => `You must have at least ${minutes} minutes between reservations`,
  maxPerDay: (max: number) => `You can only make ${max} ${max === 1 ? 'reservation' : 'reservations'} per day`,
};
