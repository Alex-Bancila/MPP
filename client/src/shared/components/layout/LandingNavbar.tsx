import { useNavigate } from 'react-router-dom'

export const LandingNavbar = () => {
  const navigate = useNavigate()

  return (
    <header className="mc-landing-navbar">
      <div className="mc-landing-navbar__brand" role="img" aria-label="Music Core logo">
        MUSIC CORE
      </div>

      <div className="mc-landing-navbar__actions">
        <button
          type="button"
          className="mc-landing-navbar__login"
          onClick={() => navigate('/login')}
        >
          Login
        </button>
        <button
          type="button"
          className="mc-landing-navbar__register"
          onClick={() => navigate('/register')}
        >
          Register
        </button>
      </div>
    </header>
  )
}
