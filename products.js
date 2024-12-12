const axios = require('axios');

// Set up BigCommerce API credentials and store details
const API_URL = 'https://api.bigcommerce.com/stores/ur7wjnshy8/v3'; // Replace YOUR_STORE_HASH with your store's hash
const API_TOKEN = 'ex2a5xr1mduhca0cz90mbbn0a3eeg5u'; // Replace with your API token
const CHANNEL_ID = 1646467; // Channel ID to assign products

// Function to fetch all product IDs
async function getProductIds() {
  let allProductIds = [];
  let page = 1;
  let hasNextPage = true;

  while (hasNextPage) {
    try {
      const response = await axios.get(`${API_URL}/catalog/products`, {
        headers: {
          'X-Auth-Token': API_TOKEN,
          'Content-Type': 'application/json',
        },
        params: { page, limit: 50 }, // Fetch 50 products per page
      });

      const products = response.data.data;

      allProductIds = allProductIds.concat(products.map(product => product.id));
      console.log("productId : " + allProductIds);

      // Check if there are more pages
      hasNextPage = response.data.meta.pagination.total_pages > page;
      page++;
    } catch (error) {
      console.error('Error fetching products:', error.response?.data || error.message);
      hasNextPage = false;
    }
  }

  return allProductIds;
}

// Function to assign product IDs to a channel in chunks
async function assignProductsToChannelInBatches(productIds) {
  const chunkSize = 50; // Process 50 products per batch
  for (let i = 0; i < productIds.length; i += chunkSize) {
    const batch = productIds.slice(i, i + chunkSize);
    const assignments = batch.map(id => ({ product_id: id, channel_id: CHANNEL_ID }));

    try {
      const response = await axios.put(
        `${API_URL}/catalog/products/channel-assignments`,
        assignments,
        {
          headers: {
            'X-Auth-Token': API_TOKEN,
            'Content-Type': 'application/json',
          }
        }
      );

      console.log(`Successfully assigned batch to channel ${CHANNEL_ID}:`, response.data);
    } catch (error) {
      console.error('Error assigning batch to channel:', error.response?.data || error.message);
    }
  }
}

// Main function to fetch product IDs and assign them to the channel in batches
async function main() {
  console.log('Fetching product IDs...');
  const productIds = await getProductIds();

  if (productIds.length > 0) {
    console.log(`Fetched ${productIds.length} product IDs.`);
    console.log('Assigning product IDs to channel in batches...');
    await assignProductsToChannelInBatches(productIds);
  } else {
    console.log('No products found.');
  }
}

main();
