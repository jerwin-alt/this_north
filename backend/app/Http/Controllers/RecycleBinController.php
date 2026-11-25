<?php

// app/Http/Controllers/Admin/RecycleBinController.php
namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\Menu;
use App\Models\Category;
use App\Models\Ingredient;
use App\Models\User;
use App\Models\Order;
use App\Models\InventoryTransaction;
use App\Models\Feedback;
use App\Models\LostAndDamage;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class RecycleBinController extends Controller
{
    /**
     * Map tab keys to model classes.
     */
    private function getModelMap(): array
    {
        return [
            'products'    => Menu::class,
            'categories'  => Category::class,
            'ingredients' => Ingredient::class,
            'customers'   => User::class, // will filter by role = customer
            'users'       => User::class, // will filter by role in admin/staff
            'orders'      => Order::class,
            'inventory'   => InventoryTransaction::class,
            'feedback'    => Feedback::class,
            'lost_and_damages' => LostAndDamage::class, 
        ];
    }

    /**
     * Retrieve deleted records by category.
     */
    public function index(Request $request)
    {
        $modelMap = $this->getModelMap();
        $tab = $request->query('tab', 'all');

        if ($tab === 'all') {
            $results = [];
            foreach ($modelMap as $key => $model) {
                $query = $model::onlyTrashed();
                if ($model === User::class) {
                    if ($key === 'customers') {
                        $query->where('role', 'customer');
                    } elseif ($key === 'users') {
                        $query->whereIn('role', ['admin', 'staff']);
                    }
                }
                $results[$key] = $query->latest('deleted_at')->get();
            }
            return response()->json(['data' => $results]);
        }

        if (!isset($modelMap[$tab])) {
            return response()->json(['message' => 'Invalid tab'], 400);
        }

        $model = $modelMap[$tab];
        $query = $model::onlyTrashed();

        if ($model === User::class) {
            if ($tab === 'customers') {
                $query->where('role', 'customer');
            } elseif ($tab === 'users') {
                $query->whereIn('role', ['admin', 'staff']);
            }
        }

        $records = $query->latest('deleted_at')->paginate(20);

        return response()->json(['data' => $records]);
    }

    /**
     * Restore a single record.
     */
    public function restore(Request $request)
    {
        $validator = Validator::make($request->all(), [
            // Added 'lost_and_damages' to the allowed list
            'category' => 'required|string|in:products,categories,ingredients,customers,users,orders,inventory,feedback,lost_and_damages',
            'id'       => 'required|integer',
        ]);

        if ($validator->fails()) {
            return response()->json(['message' => 'Invalid request', 'errors' => $validator->errors()], 422);
        }

        $modelMap = $this->getModelMap();
        $modelClass = $modelMap[$request->category];

        $record = $modelClass::onlyTrashed()->find($request->id);

        if (!$record) {
            return response()->json(['message' => 'Record not found or already restored'], 404);
        }

        if (!$this->canRestore($record, $request->category)) {
            return response()->json(['message' => $this->getRestoreErrorMessage($record, $request->category)], 422);
        }

        try {
            DB::transaction(function () use ($record) {
                $record->restore();
            });
        } catch (\Illuminate\Database\QueryException $e) {
            if ($e->errorInfo[1] == 1062) { 
                return response()->json(['message' => 'A conflicting record already exists. Please resolve the duplicate before restoring.'], 422);
            }
            throw $e; 
        } catch (\Exception $e) {
            return response()->json(['message' => 'Restore failed: ' . $e->getMessage()], 500);
        }

        return response()->json(['message' => 'Record restored successfully']);
    }

    /**
     * Bulk restore multiple records.
     */
    public function bulkRestore(Request $request)
    {
        // Fixed validation: Removed the invalid `required_if:!=` syntax
        $validator = Validator::make($request->all(), [
            'category' => 'required|string|in:products,categories,ingredients,customers,users,orders,inventory,feedback,lost_and_damages,all',
            'ids'      => 'array',
            'ids.*'    => 'integer',
            'grouped_ids' => 'array',
            'grouped_ids.*' => 'array',
            'grouped_ids.*.*' => 'integer',
        ]);

        if ($validator->fails()) {
            return response()->json(['message' => 'Invalid request', 'errors' => $validator->errors()], 422);
        }

        $modelMap = $this->getModelMap();
        $restored = [];
        $failed = [];

        if ($request->category === 'all') {
            if (empty($request->grouped_ids)) {
                return response()->json(['message' => 'No records selected.'], 400);
            }

            // Loop through the grouped categories from the "All" tab
            foreach ($request->grouped_ids as $categoryKey => $ids) {
                if (!isset($modelMap[$categoryKey])) continue;
                
                $modelClass = $modelMap[$categoryKey];
                $records = $modelClass::onlyTrashed()->whereIn('id', $ids)->get();
                
                foreach ($records as $record) {
                    $this->processRestore($record, $categoryKey, $restored, $failed);
                }
            }
        } else {
            if (empty($request->ids)) {
                return response()->json(['message' => 'No records selected.'], 400);
            }

            // Normal bulk restore for specific tabs
            $modelClass = $modelMap[$request->category];
            $records = $modelClass::onlyTrashed()->whereIn('id', $request->ids)->get();

            foreach ($records as $record) {
                $this->processRestore($record, $request->category, $restored, $failed);
            }
        }

        return response()->json([
            'message'  => count($restored) . ' record(s) restored successfully.',
            'restored' => $restored,
            'failed'   => $failed,
        ]);
    }

    /**
     * Helper method to process a single restore during bulk operations
     */
    private function processRestore($record, $category, &$restored, &$failed)
    {
        if ($this->canRestore($record, $category)) {
            try {
                DB::transaction(function () use ($record) {
                    $record->restore();
                });
                $restored[] = $record->id;
            } catch (\Illuminate\Database\QueryException $e) {
                if ($e->errorInfo[1] == 1062) {
                    $failed[$record->id] = 'A conflicting record already exists.';
                } else {
                    $failed[$record->id] = 'Database error: ' . $e->getMessage();
                }
            } catch (\Exception $e) {
                $failed[$record->id] = 'Restore failed: ' . $e->getMessage();
            }
        } else {
            $failed[$record->id] = $this->getRestoreErrorMessage($record, $category);
        }
    }

    /**
     * Validate whether a record can be safely restored.
     */
    private function canRestore($record, string $category): bool
    {
        // Check for unique conflicts
        if ($category === 'users') {
            $existing = User::where('email', $record->email)
                ->where('id', '!=', $record->id)
                ->whereNull('deleted_at')
                ->exists();
            if ($existing) {
                return false;
            }
        }

        if ($category === 'products') {
            $existing = Menu::where('sku', $record->sku)
                ->where('id', '!=', $record->id)
                ->whereNull('deleted_at')
                ->exists();
            if ($existing) {
                return false;
            }
        }

        if ($category === 'categories') {
            $existing = Category::where('name', $record->name)
                ->where('id', '!=', $record->id)
                ->whereNull('deleted_at')
                ->exists();
            if ($existing) {
                return false;
            }
        }

        // Check if a required parent is still deleted
        if ($category === 'products') {
            $parentCategory = Category::withTrashed()->find($record->category_id);
            if ($parentCategory && $parentCategory->trashed()) {
                return false;
            }
        }

        return true;
    }

    /**
     * Generate a user-friendly error message for failed restoration.
     */
    private function getRestoreErrorMessage($record, string $category): string
    {
        if ($category === 'users') {
            return 'A user with the same email already exists. Please rename or remove the conflicting record before restoring.';
        }
        if ($category === 'products') {
            return 'A product with the same SKU already exists, or its category is still deleted.';
        }
        if ($category === 'categories') {
            return 'A category with the same name already exists.';
        }
        return 'The record cannot be restored due to a conflict.';
    }
}