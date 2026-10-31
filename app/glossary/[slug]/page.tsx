import { docRoute } from '@/components/content/routes';

const route = docRoute('glossary');

export const dynamicParams = false;
export const generateStaticParams = route.generateStaticParams;
export const generateMetadata = route.generateMetadata;
export default route.Page;
