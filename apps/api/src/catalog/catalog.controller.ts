import { Controller, Get, Headers, Param, Query } from '@nestjs/common';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { langFrom } from '../common/i18n';
import { CatalogService } from './catalog.service';

class ProductQueryDto {
  @IsOptional() @IsString() category?: string;
  @IsOptional() @IsString() animal?: string;
  @IsOptional() @IsString() q?: string;
  @IsOptional() @IsIn(['new', 'trending']) tag?: 'new' | 'trending';
  @IsOptional() @IsIn(['new', 'price_asc', 'price_desc']) sort?: 'new' | 'price_asc' | 'price_desc';
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(60) limit?: number;
}

@Controller()
export class CatalogController {
  constructor(private readonly catalog: CatalogService) {}

  @Get('categories')
  categories(@Headers('accept-language') al?: string) {
    return this.catalog.categories(langFrom(al));
  }

  @Get('animal-types')
  animalTypes(@Headers('accept-language') al?: string) {
    return this.catalog.animalTypes(langFrom(al));
  }

  @Get('banners')
  banners(@Headers('accept-language') al?: string) {
    return this.catalog.banners(langFrom(al));
  }

  @Get('products')
  products(@Query() q: ProductQueryDto, @Headers('accept-language') al?: string) {
    return this.catalog.products(q, langFrom(al));
  }

  @Get('products/:slug')
  product(@Param('slug') slug: string, @Headers('accept-language') al?: string) {
    return this.catalog.product(slug, langFrom(al));
  }
}
