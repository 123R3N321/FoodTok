/**
 * Next.js API Route - Yelp Business Detail Proxy
 * This route handles server-side Yelp API calls for business details
 */

import { NextRequest, NextResponse } from 'next/server';

const YELP_API_BASE = 'https://api.yelp.com/v3';
const YELP_API_KEY = process.env.YELP_API_KEY || '';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: businessId } = await params;

    // Make request to Yelp API
    const response = await fetch(`${YELP_API_BASE}/businesses/${businessId}`, {
      headers: {
        'Authorization': `Bearer ${YELP_API_KEY}`,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Yelp API error:', response.status, errorData);
      return NextResponse.json(
        { error: `Yelp API error: ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error proxying Yelp business detail:', error);
    return NextResponse.json(
      { error: 'Failed to fetch from Yelp API' },
      { status: 500 }
    );
  }
}
