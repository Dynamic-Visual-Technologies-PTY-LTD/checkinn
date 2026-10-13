CREATE TABLE `cities` (
	`id` text PRIMARY KEY NOT NULL,
	`sort_order` integer NOT NULL,
	`name` text NOT NULL,
	`aliases` text NOT NULL,
	`province` text NOT NULL,
	`country` text NOT NULL,
	`country_code` text NOT NULL,
	`description` text NOT NULL,
	`image_url` text NOT NULL,
	`image_alt` text NOT NULL,
	`image_source_url` text NOT NULL,
	`image_credit_instructions` text NOT NULL,
	`image_is_illustrative` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `hotel_images` (
	`hotel_id` text NOT NULL,
	`position` integer NOT NULL,
	`url` text NOT NULL,
	`alt` text NOT NULL,
	`provider` text NOT NULL,
	`is_illustrative` integer NOT NULL,
	`source_url` text NOT NULL,
	`license_url` text NOT NULL,
	PRIMARY KEY(`hotel_id`, `position`),
	FOREIGN KEY (`hotel_id`) REFERENCES `hotels`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `hotels` (
	`id` text PRIMARY KEY NOT NULL,
	`city_id` text NOT NULL,
	`name` text NOT NULL,
	`is_fictional` integer NOT NULL,
	`area` text NOT NULL,
	`category` text NOT NULL,
	`description` text NOT NULL,
	`star_rating` integer NOT NULL,
	`review_score` real NOT NULL,
	`review_score_max` real NOT NULL,
	`review_count` integer NOT NULL,
	`currency` text NOT NULL,
	`price_from_per_night_rand` integer NOT NULL,
	`amenities` text NOT NULL,
	`check_in_time` text NOT NULL,
	`check_out_time` text NOT NULL,
	`time_zone` text NOT NULL,
	`policies` text NOT NULL,
	FOREIGN KEY (`city_id`) REFERENCES `cities`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `hotels_city_id_idx` ON `hotels` (`city_id`);--> statement-breakpoint
CREATE TABLE `room_types` (
	`id` text PRIMARY KEY NOT NULL,
	`hotel_id` text NOT NULL,
	`position` integer NOT NULL,
	`name` text NOT NULL,
	`max_guests` integer NOT NULL,
	`beds` text NOT NULL,
	`price_per_night_rand` integer NOT NULL,
	`total_rooms` integer NOT NULL,
	`amenities` text NOT NULL,
	FOREIGN KEY (`hotel_id`) REFERENCES `hotels`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `room_types_hotel_id_idx` ON `room_types` (`hotel_id`);