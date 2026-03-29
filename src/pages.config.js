import Admin from './pages/Admin';
import AdminPanel from './pages/AdminPanel';
import AdminProducts from './pages/AdminProducts';
import Cart from './pages/Cart';
import Favorites from './pages/Favorites';
import Home from './pages/Home';
import HowToOrder from './pages/HowToOrder';
import Login from './pages/Login';
import MarysKitchen from './pages/MarysKitchen';
import Menu from './pages/Menu';
import Orders from './pages/Orders';
import ProductDetails from './pages/ProductDetails';
import Profile from './pages/Profile';
import Payments from './pages/Payments';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Admin": Admin,
    "AdminPanel": AdminPanel,
    "AdminProducts": AdminProducts,
    "Cart": Cart,
    "Favorites": Favorites,
    "Home": Home,
    "HowToOrder": HowToOrder,
    "Login": Login,
    "MarysKitchen": MarysKitchen,
    "Menu": Menu,
    "Orders": Orders,
    "ProductDetails": ProductDetails,
    "Profile": Profile,
    "Payments": Payments,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};