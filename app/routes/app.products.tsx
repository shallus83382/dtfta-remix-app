import { Outlet } from "react-router";

/**
 * Layout route for /app/products and /app/products/customize.
 * Renders the index (products list) or the customize child in the Outlet.
 */
export default function ProductsLayout() {
  return <Outlet />; 
}
