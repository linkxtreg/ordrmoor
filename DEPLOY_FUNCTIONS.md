# Deploy Supabase Edge Functions

To deploy the updated menu API (with the new Menus layer), run these commands in Terminal:

## 1. Install Supabase CLI (if needed)

```bash
npm install -g supabase
```

## 2. Login to Supabase

```bash
supabase login
```

## 3. Link your project (from project directory)

```bash
cd "/Users/mostafaafify/Downloads/Nour Menu"
supabase link --project-ref pfrpliybqegikexwuokl
```

## 4. Deploy the function

```bash
supabase functions deploy make-server-47a828b2
```

Or use the npm script:

```bash
npm run deploy:functions
```

---

**Alternative:** Deploy from the [Supabase Dashboard](https://supabase.com/dashboard/project/pfrpliybqegikexwuokl/functions):
1. Open your project → Edge Functions
2. Find `make-server-47a828b2` (or create it)
3. Replace the code with the contents of `supabase/functions/server/index.tsx`
4. Deploy
