import { redirect } from 'next/navigation';

// Trends now live in one place: /portal/trends. That page sits behind the
// supervisor / executive login and is open to every account that can log in,
// not just two roles. This old address just forwards there (logged-out
// visitors are then sent on to the login page).
export default function DashboardPage() {
  redirect('/portal/trends');
}
