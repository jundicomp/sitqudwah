import { useAppData } from '../../context/AppContext';

export default function ToastContainer() {
  const { toasts } = useAppData();
  return (
    <div className="toast-wrap">
      {toasts.map(t => (
        <div key={t.id} className={'toast' + (t.type === 'error' ? ' error' : '')}>{t.message}</div>
      ))}
    </div>
  );
}
