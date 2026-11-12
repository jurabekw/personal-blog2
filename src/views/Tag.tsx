import type { Metadata } from 'next'
import { TermArchive, termMetadata } from '@/components/site/TermArchive'
import type { Script } from '@/lib/alphabet'

type Props = { params: Promise<{ path: string[] }> }

export function tagStaticParams() {
  return []
}

export async function metadataTag(script: Script, { params }: Props): Promise<Metadata> {
  return termMetadata('tag', (await params).path, script)
}

export async function renderTag(script: Script, { params }: Props) {
  return <TermArchive taxonomy="tag" segments={(await params).path} script={script} />
}
