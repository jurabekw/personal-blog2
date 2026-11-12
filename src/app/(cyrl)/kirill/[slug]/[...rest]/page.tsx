import { renderSlugCatchAll } from '@/views/SlugCatchAll'

export default function CatchAll(props: PageProps<'/kirill/[slug]/[...rest]'>) {
  return renderSlugCatchAll('cyrl', props)
}
