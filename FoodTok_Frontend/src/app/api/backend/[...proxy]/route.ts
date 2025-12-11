/**
 * Backend API Proxy
 * Forwards all requests to the Django backend
 * This allows runtime configuration of backend URL instead of build-time
 */

import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_API_URL || 'http://localhost:8080/api';

export async function GET(request: NextRequest) {
  return proxy(request);
}

export async function POST(request: NextRequest) {
  return proxy(request);
}

export async function PUT(request: NextRequest) {
  return proxy(request);
}

export async function DELETE(request: NextRequest) {
  return proxy(request);
}

export async function PATCH(request: NextRequest) {
  return proxy(request);
}

async function proxy(request: NextRequest) {
  try {
    // Extract the path after /api/backend
    const path = request.nextUrl.pathname.replace('/api/backend', '');
    const url = `${BACKEND_URL}${path}${request.nextUrl.search}`;
    
    console.log(`[Proxy] ${request.method} ${path} -> ${url}`);

    // Get request body for non-GET requests
    const body = request.method !== 'GET' && request.method !== 'HEAD' 
      ? await request.text() 
      : undefined;

    // Forward the request to backend
    const response = await fetch(url, {
      method: request.method,
      headers: request.headers,
      body,
    });

    // Get response body
    const responseBody = await response.text();

    // Return response with same status and headers
    return new NextResponse(responseBody, {
      status: response.status,
      headers: response.headers,
    });
  } catch (error) {
    console.error('[Proxy] Error:', error);
    return NextResponse.json(
      { error: 'Failed to connect to backend' },
      { status: 502 }
    );
  }
}
