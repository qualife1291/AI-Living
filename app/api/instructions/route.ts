import {instructions} from '@/lib/world';
export async function GET(){return new Response(instructions,{headers:{'content-type':'text/plain; charset=utf-8','cache-control':'private,no-store'}});}
