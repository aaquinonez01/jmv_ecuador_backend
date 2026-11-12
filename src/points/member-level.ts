// Sección de JMV según la edad (Estatutos, art. 8):
// Infancia Misionera 9 a 11, Prejuveniles 12 a 15, Jóvenes 16 a 35.
export function levelFromBirthDate(
  birthDate?: Date | string | null,
  today = new Date(),
): string | null {
  if (!birthDate) return null;
  const b = new Date(birthDate);
  if (Number.isNaN(b.getTime())) return null;
  let age = today.getFullYear() - b.getUTCFullYear();
  const m = today.getMonth() - b.getUTCMonth();
  if (m < 0 || (m === 0 && today.getDate() < b.getUTCDate())) age--;
  if (age >= 9 && age <= 11) return 'infancia';
  if (age >= 12 && age <= 15) return 'prejuvenil';
  if (age >= 16 && age <= 35) return 'juvenil';
  return null;
}
