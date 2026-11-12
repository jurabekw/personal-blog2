import { renderSlugCatchAll } from '@/views/SlugCatchAll'

export default function CatchAll(props: PageProps<'/[slug]/[...rest]'>) {
  return renderSlugCatchAll('latn', props)
}
