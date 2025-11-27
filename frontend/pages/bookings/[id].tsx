import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import axios from 'axios';

export default function BookingDetail() {
  const router = useRouter();
  const { id } = router.query;
  const [booking, setBooking] = useState<any>(null);
  const [attachments, setAttachments] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMsg, setNewMsg] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('sessionToken');
    if (!token) { router.push('/'); return; }
    if (!id) return;

    (async () => {
      try {
        const [bResp, aResp, mResp] = await Promise.all([
          axios.get(`${process.env.NEXT_PUBLIC_BACKEND}/api/bookings/${id}`, { headers: { 'x-session-token': token } }),
          axios.get(`${process.env.NEXT_PUBLIC_BACKEND}/api/bookings/${id}/attachments`, { headers: { 'x-session-token': token } }),
          axios.get(`${process.env.NEXT_PUBLIC_BACKEND}/api/bookings/${id}/messages`, { headers: { 'x-session-token': token } })
        ]);
        setBooking(bResp.data.booking);
        setAttachments(aResp.data.attachments || []);
        setMessages(mResp.data.messages || []);
      } catch (err) {
        console.error(err);
      } finally { setLoading(false); }
    })();
  }, [id]);

  async function sendMessage(e:any) {
    e.preventDefault();
    const token = localStorage.getItem('sessionToken');
    if (!newMsg.trim()) return;
    const resp = await axios.post(`${process.env.NEXT_PUBLIC_BACKEND}/api/bookings/${id}/messages`, { text: newMsg }, { headers: { 'x-session-token': token }});
    setMessages(prev => [...prev, resp.data.message]);
    setNewMsg('');
  }

  if (loading) return <p>Loading...</p>;

  return (
    <div style={{maxWidth:900, margin:'2rem auto'}}>
      <button onClick={() => router.back()}>← Back</button>
      <h2>Booking Detail</h2>
      <pre>{JSON.stringify(booking, null, 2)}</pre>

      <h3>Attachments</h3>
      <ul>
        {attachments.map(a => (
          <li key={a.uuid}>
            {a.filename || a.name}
            {' — '}
            <a href={`${process.env.NEXT_PUBLIC_BACKEND}/api/attachments/${a.uuid}/download`} target="_blank" rel="noreferrer">Download</a>
          </li>
        ))}
      </ul>

      <h3>Messages</h3>
      <ul>
        {messages.map(m => (
          <li key={m.id}><strong>{m.userId}</strong>: {m.text} <em style={{fontSize:12, color:'#666'}}>({new Date(m.createdAt).toLocaleString()})</em></li>
        ))}
      </ul>

      <form onSubmit={sendMessage}>
        <textarea value={newMsg} onChange={e=>setNewMsg(e.target.value)} rows={3} style={{width:'100%'}}/>
        <button type="submit">Send message</button>
      </form>
    </div>
  );
}
