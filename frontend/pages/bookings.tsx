import { useEffect, useState } from 'react';
import axios from 'axios';
import Link from 'next/link';
import { useRouter } from 'next/router';

export default function Bookings() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('sessionToken');
    const userEmail = localStorage.getItem('userEmail');
    if (!token) { router.push('/'); return; }

    (async () => {
      try {
        const resp = await axios.get(`${process.env.NEXT_PUBLIC_BACKEND}/api/bookings`, {
          headers: { 'x-session-token': token },
          params: { customer_email: userEmail }
        });
        setBookings(resp.data.bookings || resp.data);
      } catch (err) {
        console.error(err);
      } finally { setLoading(false); }
    })();
  }, []);

  if (loading) return <p>Loading...</p>;

  return (
    <div style={{maxWidth:900, margin:'2rem auto'}}>
      <h2>Your Bookings</h2>
      <ul>
        {bookings.map(b => (
          <li key={b.uuid || b.job_uuid || b.id} style={{ marginBottom: '1rem' }}>
            <Link href={`/bookings/${b.job_uuid || b.uuid || b.id}`}>
              {b.title || b.job_description || b.job_title || `Booking ${b.uuid || b.job_uuid}`}
            </Link>
            <div style={{fontSize:12, color:'#666'}}>{b.scheduled_for || b.start_time || ''}</div>
          </li>
        ))}
      </ul>
    </div>
  );
}