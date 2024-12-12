const fs = require('fs');
const csv = require('csv-parser');
const axios = require('axios');
const XLSX = require('xlsx');

// BigCommerce API Configuration
const STORE_HASH = '6cdngmevrl'; // Your BigCommerce store hash
const AUTH_TOKEN = '4hy7ly90yehmxl6e7xzmpzg93pkites'; // Your BigCommerce API token

// Helper function to create a customer
const createCustomer = async (customer) => {
  try {
    const response = await axios.post(
      `https://api.bigcommerce.com/stores/${STORE_HASH}/v3/customers`,
      [customer],
      {
        headers: {
          'X-Auth-Token': AUTH_TOKEN,
          'Content-Type': 'application/json',
        },
      }
    );
    return response.data.data[0].id; // Return the customer ID
  } catch (error) {
    console.error('Error creating customer:', error.response?.data || error.message);
    return null;
  }
};

// Helper function to post metafields for a customer
const postMetafield = async (customerId, key, value) => {
  const data = {
    permission_set: 'read',
    namespace: 'custom_fields',
    key: key,
    value: value,
  };

  try {
    const response = await axios.post(
      `https://api.bigcommerce.com/stores/${STORE_HASH}/v3/customers/${customerId}/metafields`,
      data,
      {
        headers: {
          'X-Auth-Token': AUTH_TOKEN,
          'Content-Type': 'application/json',
        },
      }
    );
    console.log(`Metafield ${key} for Customer ID ${customerId} posted successfully.`);
  } catch (error) {
    console.error(
      `Error posting metafield ${key} for Customer ID ${customerId}:`,
      error.response?.data || error.message
    );
  }
};

// Main function to process the CSV file
const processCsv = (csvFilePath) => {
    const customers = [];
    const results = [];
  
    fs.createReadStream(csvFilePath)
      .pipe(csv())
      .on('data', (row) => {
        const customer = {
          email: row.email,
          first_name: row.first_name,
          last_name: row.last_name,
          customer_group_id: parseInt(row.customer_group_id) || 0,
          addresses: [
            {
              address1: row.address,
              city: row.city,
              country_code: row.country_code,
              first_name: row.first_name,
              last_name: row.last_name,
              phone: row.phone,
              postal_code: row.zip || '11111',
              state_or_province: row.state,
            },
          ],
          form_fields: [
            { name: 'owner_name', value: row.owner_name },
            { name: 'license (Tax ID)', value: row['license (Tax ID)'] },
            { name: 'Priority', value: row.Priority },
          ].filter((field) => field.value), // Filter out empty fields
        };
  
        const metafields = [
            { name: 'contractid', value: row.contractid },
            { name: 'Site_Config_Id', value: String(row.Site_Config_Id) }, // Ensure correct data type
            { name: 'RegistrationDate', value: row.RegistrationDate },
            { name: 'account_balance', value: row.account_balance },
          ].filter((field) => field.value); // Filter out empty values
          
  
        customers.push({ customer, metafields });
      })
      .on('end', async () => {
        console.log('CSV file successfully processed.');
  
        for (const { customer, metafields } of customers) {
          let customerId = null;
          let status = 'Success'; // Default to success
  
          try {
            // Step 1: Create Customer
            customerId = await createCustomer(customer);
  
            if (!customerId) {
              status = 'Error: Customer creation failed';
            }
  
            console.log(`Customer ${customer.email} created with ID ${customerId}`);
          } catch (error) {
            console.error(`Error creating customer ${customer.email}:`, error.message);
            status = `Error: ${error.message}`;
          }
  
          // Process metafields only if customer creation was successful
          const metafieldResults = [];
          if (customerId) {
            for (const field of metafields) {
              try {
                await postMetafield(customerId, field.name.trim(), field.value.trim());
                metafieldResults.push({ key: field.name, value: field.value });
              } catch (error) {
                console.error(
                  `Error posting metafield ${field.name} for customer ${customer.email}:`,
                  error.message
                );
                status = `Error: Metafield ${field.name} failed`;
              }
            }
          }
  
          // Ensure each email is printed only once in the results
          results.push({
            email: customer.email,
            customer_id: customerId || 'N/A',
            status,
          });
        }
  
        // Step 3: Write results to an Excel file
        writeResultsToExcel(results, 'report2.xlsx');
      });
  };
  
  
  // Updated Helper Function to Write Results
  const writeResultsToExcel = (data, outputFilePath) => {
    const uniqueResults = [];
    const seenEmails = new Set();
  
    // Ensure emails appear only once in the results
    data.forEach((result) => {
      if (!seenEmails.has(result.email)) {
        uniqueResults.push(result);
        seenEmails.add(result.email);
      }
    });
  
    const worksheetData = uniqueResults.map((item) => ({
      Email: item.email,
      Customer_ID: item.customer_id,
      Status: item.status,
    }));
  
    const worksheet = XLSX.utils.json_to_sheet(worksheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Results');
    XLSX.writeFile(workbook, outputFilePath);
  
    console.log(`Results written to ${outputFilePath}`);
  };

// Specify the CSV file path
const csvFilePath = 'sample10.csv';
processCsv(csvFilePath);
