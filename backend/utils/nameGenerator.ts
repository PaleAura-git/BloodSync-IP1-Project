const maleFirstNames: string[] = [
  'Ahmed', 'Mohammed', 'Ali', 'Khalid', 'Salim', 'Abdullah', 'Omar', 'Saeed',
  'Hamad', 'Rashid', 'Yousuf', 'Hassan', 'Sultan', 'Tariq', 'Nasser', 'Fahad',
  'Majid', 'Waleed', 'Faisal', 'Saud', 'Badr', 'Hilal', 'Mubarak', 'Qais',
  'Turki', 'Zayed', 'Adel', 'Bader', 'Nawaf', 'Mansour', 'Hatem', 'Wissam',
  'Ammar', 'Kareem', 'Jamal', 'Rami', 'Samir', 'Talib', 'Zaher', 'Bilal',
];

const femaleFirstNames: string[] = [
  'Fatima', 'Aisha', 'Maryam', 'Khadija', 'Salma', 'Huda', 'Layla', 'Noor',
  'Zainab', 'Amina', 'Sara', 'Noura', 'Reem', 'Hessa', 'Marwa', 'Shamma',
  'Amal', 'Wafa', 'Rana', 'Dina', 'Lina', 'Suha', 'Ruba', 'Nada',
  'Hana', 'Manal', 'Abeer', 'Ghada', 'Rania', 'Yara', 'Asma', 'Dalal',
  'Maysa', 'Najwa', 'Samira', 'Tahani', 'Widad', 'Zahra', 'Basma', 'Eman',
];

const lastNames: string[] = [
  'Al Balushi', 'Al Habsi', 'Al Maawali', 'Al Rashdi', 'Al Hinai',
  'Al Zadjali', 'Al Ghazali', 'Al Kindi', 'Al Rawahi', 'Al Siyabi',
  'Al Hajri', 'Al Farsi', 'Al Wahaibi', 'Al Saadi', 'Al Busaidi',
  'Al Lawati', 'Al Shanfari', 'Al Amri', 'Al Maskari', 'Al Mamari',
  'Al Jabri', 'Al Maqbali', 'Al Harthi', 'Al Buraiki', 'Al Harrasi',
  'Al Abri', 'Al Hadhrami', 'Al Riyami', 'Al Nabhani', 'Al Muqaimi',
  'Al Yahmadi', 'Al Sulaimani', 'Al Kathiri', 'Al Barwani', 'Al Shihi',
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function generateRandomName(): string {
  const isMale = Math.random() < 0.5;
  const firstName = isMale ? pick(maleFirstNames) : pick(femaleFirstNames);
  const lastName = pick(lastNames);
  return `${firstName} ${lastName}`;
}

export function nameToEmailSlug(fullName: string): string {
  const parts = fullName.toLowerCase().split(' ');
  // "Ahmed Al Balushi" → "ahmed" + "albalushi"
  const first = parts[0];
  const last = parts.slice(1).join('');
  return `${first}.${last}`;
}
