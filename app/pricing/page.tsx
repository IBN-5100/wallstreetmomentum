"use client";
import React, { useEffect } from "react";
const StripePricingTable = () => {
useEffect(() => {
const script = document.createElement("script");
script.src = "https://js.stripe.com/v3/pricing-table.js";
script.async = true;
document.body.appendChild(script);
return () => {
document.body.removeChild(script);
};
}, []);
return React.createElement("stripe-pricing-table", {
"pricing-table-id": "prctbl_1Q2kbuFPwZ4vK30YtmOjDZky",
"publishable-key": "pk_test_51Q2ObyFPwZ4vK30YSYbw3AT995qsG5xb7ot15Bs32yr6vZso0baDemXe753gNVcQq0niulgRIxc1f1xOZRHRI73A00reoAU9qw",
});
};
export default StripePricingTable;
