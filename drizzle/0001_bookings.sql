CREATE TABLE `booking_lines` (
	`booking_id` integer NOT NULL,
	`room_type_id` text NOT NULL,
	`quantity` integer NOT NULL,
	`unit_price_rand` integer NOT NULL,
	`line_total_rand` integer NOT NULL,
	PRIMARY KEY(`booking_id`, `room_type_id`),
	FOREIGN KEY (`booking_id`) REFERENCES `bookings`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`room_type_id`) REFERENCES `room_types`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "booking_lines_quantity_check" CHECK("booking_lines"."quantity" > 0)
);
--> statement-breakpoint
CREATE INDEX `booking_lines_room_type_id_idx` ON `booking_lines` (`room_type_id`);--> statement-breakpoint
CREATE TABLE `bookings` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`reference` text NOT NULL,
	`idempotency_key` text NOT NULL,
	`access_token` text NOT NULL,
	`hotel_id` text NOT NULL,
	`status` text NOT NULL,
	`check_in` text NOT NULL,
	`check_out` text NOT NULL,
	`adults` integer NOT NULL,
	`children` integer NOT NULL,
	`rooms` integer NOT NULL,
	`first_name` text NOT NULL,
	`last_name` text NOT NULL,
	`email` text NOT NULL,
	`phone` text,
	`arrival_time` text,
	`special_requests` text,
	`booking_total_rand` integer NOT NULL,
	`cancellation_policy` text NOT NULL,
	`cancellation_deadline` text,
	`created_at` text NOT NULL,
	`cancelled_at` text,
	FOREIGN KEY (`hotel_id`) REFERENCES `hotels`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "bookings_status_check" CHECK("bookings"."status" IN ('confirmed', 'cancelled')),
	CONSTRAINT "bookings_stay_check" CHECK("bookings"."check_out" > "bookings"."check_in")
);
--> statement-breakpoint
CREATE UNIQUE INDEX `bookings_reference_unique` ON `bookings` (`reference`);--> statement-breakpoint
CREATE UNIQUE INDEX `bookings_idempotency_key_unique` ON `bookings` (`idempotency_key`);--> statement-breakpoint
CREATE UNIQUE INDEX `bookings_access_token_unique` ON `bookings` (`access_token`);--> statement-breakpoint
CREATE INDEX `bookings_hotel_stay_idx` ON `bookings` (`hotel_id`,`check_in`,`check_out`);