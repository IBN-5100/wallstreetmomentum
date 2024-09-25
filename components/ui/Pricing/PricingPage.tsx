import * as React from 'react';

// If using TypeScript, add the following snippet to your file as well.
declare global {
  namespace JSX {
    interface IntrinsicElements {
      'stripe-pricing-table': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
    }
  }
}

function PricingPage() {
    // Paste the stripe-pricing-table snippet in your React component
    return (
      <stripe-pricing-table
        pricing-table-id="prctbl_1Q2kbuFPwZ4vK30YtmOjDZky"
        publishable-key="pk_test_51Q2ObyFPwZ4vK30YSYbw3AT995qsG5xb7ot15Bs32yr6vZso0baDemXe753gNVcQq0niulgRIxc1f1xOZRHRI73A00reoAU9qw"
      >
      </stripe-pricing-table>
    );
  }
  
  export default PricingPage;