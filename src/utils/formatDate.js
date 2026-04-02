function formatValueDate(inputDate) {
  const date = new Date(inputDate);

  // Use Intl.DateTimeFormat to format the date
  const options = { day: '2-digit', month: 'short', year: 'numeric' };
  return new Intl.DateTimeFormat('en-GB', options).format(date);
}