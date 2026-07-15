import logo from '../assets/images/meqanox-logo.png';

const Logo = ({ width = 220 }) => {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 'auto' }}>
      <img
        src={logo}
        alt="MeQanoX — Software para Servicios Técnicos Automotrices"
        style={{
          width: `${width}px`,
          height: 'auto',
          objectFit: 'contain',
          marginTop: '12px',
          marginBottom: '12px',
        }}
      />
    </div>
  );
};

export default Logo;
