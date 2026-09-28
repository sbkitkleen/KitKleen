"use client"; 
 
import { FormEvent, useState } from "react"; 
import { createBrowserClient } from "@supabase/ssr"; 
import { useRouter } from "next/navigation"; 
 
export default function AdminLoginPage() { 
  const router = useRouter(); 
 
  const [email, setEmail] = useState(""); 
  const [password, setPassword] = useState(""); 
  const [error, setError] = useState(""); 
  const [loading, setLoading] = useState(false); 
 
  const supabase = createBrowserClient( 
    process.env.NEXT_PUBLIC_SUPABASE_URL!, 
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY! 
  ); 
 
  async function handleLogin(event: FormEvent<HTMLFormElement>) { 
    event.preventDefault(); 
 
    setError(""); 
    setLoading(true); 
 
    const { error } = await supabase.auth.signInWithPassword({ 
      email, 
      password, 
    }); 
 
    if (error) { 
      setError(error.message); 
      setLoading(false); 
      return; 
    } 
 
    router.push("/admin"); 
  } 
 
  return ( 
    <> 
      <main className="admin-login-page"> 
        <div className="admin-login-card"> 
 
          <div className="admin-login-brand"> 

            <div className="brand-small"> 
              KIT<span>KLEEN</span> 
            </div> 
 
            <h1>ADMIN PORTAL</h1> 
 
            <p> 
              Sign in to manage customer bookings. 
            </p> 
          </div> 
 
          <form onSubmit={handleLogin} className="admin-login-form"> 
 
            <div className="field"> 
              <label htmlFor="email"> 
                Email Address 
              </label> 
 
              <input 
                id="email" 
                type="email" 
                value={email} 
                onChange={(event) => setEmail(event.target.value)} 
                placeholder="admin@kitkleen.in" 
                required 
              /> 
            </div> 
 
            <div className="field"> 
              <label htmlFor="password"> 
                Password 
              </label> 
 
              <input 
                id="password" 
                type="password" 
                value={password} 
                onChange={(event) => setPassword(event.target.value)} 
                placeholder="Enter your password" 
                required 
              /> 
            </div> 
 
            {error && ( 
              <div className="login-error"> 
                {error} 
              </div> 
            )} 
 
            <button 
              type="submit" 
              disabled={loading} 
              className="login-button" 
            > 
              {loading ? "SIGNING IN..." : "SIGN IN →"} 
            </button> 
 
            <button 
              type="button" 
              className="back-button" 
              onClick={() => router.push("/")} 
            > 
              ← Back to KitKleen website 
            </button> 
 
          </form> 
        </div> 
 
        <p className="admin-copyright"> 
          © {new Date().getFullYear()} SB Sports Technologies Private Limited 
        </p> 
      </main> 
 
      <style jsx>{` 
        .admin-login-page { 
          min-height: calc(100vh - 82px); 
          background: #f3f7f5; 
          display: flex; 
          flex-direction: column; 
          align-items: center; 
          justify-content: center; 
          padding: 60px 20px; 
          box-sizing: border-box; 
        } 
 
        .admin-login-card { 
          width: 100%; 
          max-width: 460px; 
          background: #ffffff; 
          border: 1px solid #d9e2df; 
          border-radius: 16px; 
          overflow: hidden; 
          box-shadow: 0 20px 60px rgba(23, 56, 75, 0.12); 
        } 
 
        .admin-login-brand { 
          background: #17384b; 
          color: white; 
          text-align: center; 
          padding: 38px 30px 34px; 
        } 
 
        .brand-small { 
          font-size: 13px; 
          font-weight: 800; 
          letter-spacing: 2px; 
          color: #ffffff; 
        } 
 
        .brand-small span { 
          color: #a9d83b; 
        } 
 
        .admin-login-brand h1 { 
          margin: 10px 0 7px; 
          font-size: 30px; 
          line-height: 1.1; 
          font-weight: 900; 
          letter-spacing: -0.5px; 
        } 
 
        .admin-login-brand p { 
          margin: 0; 
          color: rgba(255, 255, 255, 0.7); 
          font-size: 14px; 
        } 
 
        .admin-login-form { 
          padding: 32px; 
        } 
 
        .field { 
          margin-bottom: 20px; 
        } 
 
        .field label { 
          display: block; 
          margin-bottom: 8px; 
          color: #17384b; 
          font-size: 13px; 
          font-weight: 700; 
        } 
 
        .field input { 
          width: 100%; 
          height: 48px; 
          padding: 0 14px; 
          box-sizing: border-box; 
          border: 1px solid #ccd9d5; 
          border-radius: 7px; 
          background: #ffffff; 
          color: #17384b; 
          font-size: 14px; 
          outline: none; 
        } 
 
        .field input:focus { 
          border-color: #28757b; 
          box-shadow: 0 0 0 3px rgba(40, 117, 123, 0.1); 
        } 
 
        .field input::placeholder { 
          color: #9aa9a6; 
        } 
 
        .login-error { 
          margin-bottom: 18px; 
          padding: 12px 14px; 
          border: 1px solid #efcaca; 
          border-radius: 7px; 
          background: #fff4f4; 
          color: #a33a3a; 
          font-size: 13px; 
        } 
 
        .login-button { 
          width: 100%; 
          height: 50px; 
          border: 0; 
          border-radius: 7px; 
          background: #28757b; 
          color: white; 
          font-size: 13px; 
          font-weight: 800; 
          letter-spacing: 0.5px; 
          cursor: pointer; 
          transition: background 0.2s ease, transform 0.2s ease; 
        } 
 
        .login-button:hover { 
          background: #22656a; 
          transform: translateY(-1px); 
        } 
 
        .login-button:disabled { 
          opacity: 0.6; 
          cursor: not-allowed; 
          transform: none; 
        } 
 
        .back-button { 
          display: block; 
          width: 100%; 
          margin-top: 18px; 
          border: 0; 
          background: transparent; 
          color: #28757b; 
          font-size: 13px; 
          font-weight: 700; 
          cursor: pointer; 
        } 
 
        .back-button:hover { 
          text-decoration: underline; 
        } 
 
        .admin-copyright { 
          margin-top: 24px; 
          color: #71817d; 
          font-size: 11px; 
          text-align: center; 
        } 
 
        @media (max-width: 600px) { 
          .admin-login-page { 
            padding: 40px 16px; 
          } 
 
          .admin-login-form { 
            padding: 25px 20px; 
          } 
 
          .admin-login-brand { 
            padding: 32px 20px 28px; 
          } 
 
          .admin-login-brand h1 { 
            font-size: 26px; 
          } 
        } 
      `}</style> 
    </> 
  ); 
}