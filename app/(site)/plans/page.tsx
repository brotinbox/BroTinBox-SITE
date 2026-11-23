import { permanentRedirect } from 'next/navigation';

/** Old URL. Permanent (308) so search engines move its signals to /weekly. */
export default function PlansPage() {
  permanentRedirect('/weekly');
}
