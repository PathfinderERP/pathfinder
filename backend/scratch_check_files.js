import mongoose from 'mongoose';

async function main() {
  const url = 'mongodb+srv://pathtex:pathtex@pathtex.ariihtc.mongodb.net/PATHFINDER_NEW';
  
  try {
    await mongoose.connect(url);
    console.log('Connected successfully to Mongoose');
    
    const db = mongoose.connection.db;

    // Print samples from posts
    const postsCount = await db.collection('posts').countDocuments();
    console.log(`\nPosts count: ${postsCount}`);
    if (postsCount > 0) {
      const samples = await db.collection('posts').find({}).limit(5).toArray();
      console.log('Posts samples:', JSON.stringify(samples, null, 2));
    }

    // Print samples from communityposts
    const cpCount = await db.collection('communityposts').countDocuments();
    console.log(`\nCommunityposts count: ${cpCount}`);
    if (cpCount > 0) {
      const samples = await db.collection('communityposts').find({}).limit(5).toArray();
      console.log('Communityposts samples:', JSON.stringify(samples, null, 2));
    }

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await mongoose.disconnect();
  }
}

main();
