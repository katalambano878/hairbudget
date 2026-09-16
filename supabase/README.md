# Supabase Database Migrations

This folder contains all SQL migration files for your e-commerce store database.

## 📁 Migration Files

### 001_initial_schema.sql
**Complete database schema** with all tables:
- User profiles and addresses
- Products, variants, and categories
- Orders and order items
- Cart and wishlist
- Reviews and ratings
- Coupons and loyalty program
- Blog posts
- Support tickets and returns
- Notifications
- All indexes for optimal performance

### 002_row_level_security.sql
**Security policies (RLS)** to protect user data:
- Users can only access their own data
- Public read access for products, categories, blog posts
- Secure order and payment information
- Protected personal information
- Admin-only access where needed

### 003_functions_and_triggers.sql
**Automated database operations**:
- Auto-generate order/ticket/return numbers
- Update timestamps automatically
- Create user profiles on signup
- Award loyalty points on orders
- Update product inventory
- Calculate order totals
- Manage default addresses
- Track coupon usage

### 004_storage_buckets.sql
**File storage configuration**:
- Product images
- User avatars
- Review images
- Blog images
- Category images
- Upload/download policies

### 005_sample_data.sql (Optional)
**Test data for development**:
- Sample categories
- Sample products
- Sample coupons
- Sample blog posts

## 🚀 How to Use

### Method 1: Supabase Dashboard (Recommended)

1. **Connect to Supabase** in Readdy.ai
2. **Copy each SQL file content**
3. **Go to Supabase Dashboard** → SQL Editor
4. **Run migrations in order** (001 → 002 → 003 → 004 → 005)
5. **Execute each file** one by one

### Method 2: Supabase CLI

```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Link your project
supabase link --project-ref your-project-ref

# Run migrations
supabase db push
```

### Method 3: Manual SQL Execution

1. **Open Supabase Dashboard**
2. **Navigate to SQL Editor**
3. **Copy and paste each file**
4. **Run in correct order**

## ⚠️ Important Notes

### Migration Order
**Must run in this exact order:**
1. ✅ 001_initial_schema.sql (creates tables)
2. ✅ 002_row_level_security.sql (adds security)
3. ✅ 003_functions_and_triggers.sql (adds automation)
4. ✅ 004_storage_buckets.sql (configures storage)
5. ✅ 005_sample_data.sql (optional test data)

### Security
- **RLS is enabled** on all tables
- **Users can only access their own data**
- **Products and blog posts are public**
- **Admin functions require authentication**

### Sample Data
- File `005_sample_data.sql` is **optional**
- Use for **testing and development only**
- **Delete or comment out** before production deployment

## 🔧 Customization

### Adding New Tables
Add to `001_initial_schema.sql`:
```sql
CREATE TABLE IF NOT EXISTS your_table (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  -- your columns
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Adding RLS Policies
Add to `002_row_level_security.sql`:
```sql
ALTER TABLE your_table ENABLE ROW LEVEL SECURITY;

CREATE POLICY "policy_name"
  ON your_table FOR SELECT
  USING (auth.uid() = user_id);
```

### Adding Triggers
Add to `003_functions_and_triggers.sql`:
```sql
CREATE TRIGGER your_trigger
  BEFORE INSERT ON your_table
  FOR EACH ROW
  EXECUTE FUNCTION your_function();
```

## 📊 Database Schema Overview

### Core Tables
- **profiles** - User profile information
- **addresses** - Shipping and billing addresses
- **products** - Product catalog
- **product_variants** - Product options (size, color, etc.)
- **categories** - Product categories

### E-commerce Tables
- **orders** - Order information
- **order_items** - Products in each order
- **cart_items** - Shopping cart
- **wishlist_items** - User wishlists
- **reviews** - Product reviews and ratings

### Marketing Tables
- **coupons** - Discount codes
- **loyalty_points** - Customer loyalty program
- **loyalty_transactions** - Points history
- **blog_posts** - Content marketing

### Support Tables
- **support_tickets** - Customer support
- **support_messages** - Ticket conversations
- **return_requests** - Product returns
- **return_items** - Items being returned
- **notifications** - User notifications

## 🔐 Default Policies

### User Data
✅ Users can view/edit their own profile  
✅ Users can manage their addresses  
✅ Users can view their orders  
✅ Users can manage their cart/wishlist  

### Public Data
✅ Anyone can view products  
✅ Anyone can view categories  
✅ Anyone can view blog posts  
✅ Anyone can view approved reviews  

### Protected Data
🔒 Orders are private  
🔒 Personal information is private  
🔒 Payment details are secure  
🔒 Admin functions require authentication  

## 🎯 Next Steps

After running migrations:

1. **Connect Supabase** in Readdy.ai
2. **Set up authentication** (email, Google, etc.)
3. **Configure storage** for image uploads
4. **Add products** via admin panel or API
5. **Test RLS policies** with different users
6. **Deploy edge functions** for checkout/payments

## 📚 Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Row Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [PostgreSQL Functions](https://www.postgresql.org/docs/current/plpgsql.html)
- [Storage Policies](https://supabase.com/docs/guides/storage)

## 🆘 Troubleshooting

### Migration Fails
- Check if tables already exist
- Run migrations in correct order
- Check for syntax errors
- Verify Supabase connection

### RLS Issues
- Ensure policies are created
- Check user authentication
- Verify policy conditions
- Test with different users

### Trigger Problems
- Check function definitions
- Verify trigger timing (BEFORE/AFTER)
- Test with sample data
- Review error messages

## 💡 Tips

✅ **Always backup** before running migrations  
✅ **Test in development** environment first  
✅ **Review policies** before production  
✅ **Monitor performance** with indexes  
✅ **Document changes** for your team  

---

**Ready to deploy?** Connect your Supabase project in Readdy.ai and run these migrations! 🚀
