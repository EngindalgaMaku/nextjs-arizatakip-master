'use server';

export async function getSimpleTestData() {
  console.log('getSimpleTestData called');
  return { message: 'Hello from temp action!' };
} 