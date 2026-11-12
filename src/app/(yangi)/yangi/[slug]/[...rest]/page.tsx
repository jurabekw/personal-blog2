import { renderSlugCatchAll } from '@/views/SlugCatchAll'

export default function CatchAll(props: PageProps<'/yangi/[slug]/[...rest]'>) {
  return renderSlugCatchAll('yangi', props)
}
