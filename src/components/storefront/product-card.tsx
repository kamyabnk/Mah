import { useTranslations } from "next-intl";
import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { Badge } from "@/components/ui/badge";
import { Text } from "@/components/ui/text";
import type { ProductListItem } from "@/lib/catalog/list-products";
import { getDiscountPercent } from "@/lib/catalog/pricing";
import { AddToCartButton } from "./add-to-cart-button";
import { RatingStars } from "./rating-stars";
import { WishlistToggleButton } from "./wishlist-toggle-button";

interface ProductCardProps {
  product: ProductListItem;
  isWishlisted?: boolean;
  currencyLabel: string;
}

export function ProductCard({ product, isWishlisted = false, currencyLabel }: ProductCardProps) {
  const t = useTranslations("common");
  const discount = getDiscountPercent(product);
  const isOutOfStock = product.stockQuantity <= 0;

  return (
    <div className="group relative flex flex-col gap-3">
      <div className="relative aspect-square overflow-hidden rounded-md bg-ivory-dark/40">
        <Link href={`/product/${product.slug}`} className="block h-full w-full">
          {product.primaryImage ? (
            <>
              <Image
                src={product.primaryImage}
                alt={product.name}
                fill
                sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
                className="object-cover transition-opacity duration-300 group-hover:opacity-0"
              />
              {product.hoverImage && (
                <Image
                  src={product.hoverImage}
                  alt={product.name}
                  fill
                  sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
                  className="object-cover opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                />
              )}
            </>
          ) : (
            <div className="flex h-full w-full items-center justify-center text-espresso-light">{product.name}</div>
          )}
        </Link>

        <div className="absolute left-3 top-3 flex flex-col gap-1.5">
          {isOutOfStock && <Badge variant="outOfStock">{t("outOfStock")}</Badge>}
          {!isOutOfStock && discount !== null && <Badge variant="sale">-{discount}%</Badge>}
          {!isOutOfStock && product.isNewArrival && <Badge variant="new">New</Badge>}
          {!isOutOfStock && product.isBestSeller && <Badge variant="bestseller">Best Seller</Badge>}
        </div>

        <WishlistToggleButton
          productId={product.id}
          initialWishlisted={isWishlisted}
          loginHref="/account/login"
          className="absolute right-3 top-3"
        />
      </div>

      <div className="flex flex-col gap-1">
        <Link href={`/product/${product.slug}`}>
          <Text className="font-medium text-espresso">{product.name}</Text>
        </Link>
        {product.shortDescription && <Text className="text-sm line-clamp-2">{product.shortDescription}</Text>}
        <RatingStars rating={product.averageRating} reviewCount={product.reviewCount} />
        <div className="flex items-center gap-2">
          <Text className="font-medium text-espresso">
            {(product.salePrice ?? product.price).toLocaleString()} {currencyLabel}
          </Text>
          {product.salePrice !== null && (
            <Text className="text-sm text-espresso-light line-through">
              {product.price.toLocaleString()} {currencyLabel}
            </Text>
          )}
        </div>
      </div>

      <AddToCartButton productId={product.id} disabled={isOutOfStock} />
    </div>
  );
}
