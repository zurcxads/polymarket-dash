import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const res = await fetch(
      'https://gamma-api.polymarket.com/events?closed=false&order=volume24hr&ascending=false&limit=20',
      {
        headers: { Accept: 'application/json' },
        next: { revalidate: 30 },
      }
    )
    const data = await res.json()
    return NextResponse.json(data)
  } catch {
    return NextResponse.json([], { status: 500 })
  }
}
