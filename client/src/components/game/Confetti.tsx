import ConfettiComponent from 'react-confetti';
import { useEffect, useState } from 'react';

export function Confetti() {
  const [dims, setDims] = useState({ width: window.innerWidth, height: window.innerHeight });

  useEffect(() => {
    const handler = () => setDims({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  return <ConfettiComponent width={dims.width} height={dims.height} recycle={false} />;
}
export default Confetti;
