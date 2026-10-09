export default function Spinner({ size = 'md' }) {
  const s = { sm: 'w-4 h-4', md: 'w-8 h-8', lg: 'w-12 h-12' }[size];
  return <div className={`${s} border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin`} />;
}
