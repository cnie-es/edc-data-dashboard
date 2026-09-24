interface SearchableDateRow {
  title: string;
  description: string;
  createdAt: string;
}

export function filterAndSortByDate<T extends SearchableDateRow>(
  rows: T[],
  searchText: string,
  direction: 'asc' | 'desc',
): T[] {
  const normalizedSearch = searchText.trim().toLowerCase();
  const filtered = normalizedSearch
    ? rows.filter(
        row =>
          row.title.toLowerCase().includes(normalizedSearch) ||
          row.description.toLowerCase().includes(normalizedSearch),
      )
    : [...rows];

  filtered.sort((a, b) => {
    const aDate = new Date(a.createdAt).getTime();
    const bDate = new Date(b.createdAt).getTime();
    return direction === 'asc' ? aDate - bDate : bDate - aDate;
  });

  return filtered;
}
