import { useState } from 'react';
import axios from 'axios';
import { useRouter } from 'next/router';

export default function Login() {
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  async function handleSubmit(e: any) {
    e.preventDefault();
    try {
      const resp = await axios.post(`${process.env.NEXT_PUBLIC_BACKEND}/api/login`, { email, phone });
      const { token, user } = resp.data;
      localStorage.setItem('sessionToken', token);
      localStorage.setItem('userEmail', user.email);
      router.push('/bookings');
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Login failed');
    }
  }

  return (
    <div style={{maxWidth:600, margin:'3rem auto'}}>
      <h1>Customer Portal (POC)</h1>
      <form onSubmit={handleSubmit}>
        <div style={{marginBottom:12}}>
          <label>Email</label><br/>
          <input value={email} onChange={e=>setEmail(e.target.value)} required />
        </div>
        <div style={{marginBottom:12}}>
          <label>Phone</label><br/>
          <input value={phone} onChange={e=>setPhone(e.target.value)} required />
        </div>
        <button type="submit">Sign in</button>
      </form>
      {error && <p style={{color:'red'}}>{error}</p>}
    </div>
  );
}
