-- public.templates definition

-- Drop table

-- DROP TABLE public.templates;

CREATE TABLE public.templates (
	id int8 GENERATED ALWAYS AS IDENTITY( INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START 1 CACHE 1 NO CYCLE) NOT NULL,
	"name" varchar(250) NOT NULL,
	description text NULL,
	"data" jsonb NOT NULL,
	html text NOT NULL,
	created_at timestamptz NULL,
	updated_at timestamptz DEFAULT now() NULL,
	"uuid" uuid DEFAULT gen_random_uuid() NOT NULL,
	user_id uuid NULL,
	CONSTRAINT templates_pk PRIMARY KEY (id)
);

-- public.websites definition

-- Drop table

-- DROP TABLE public.websites;

CREATE TABLE public.websites (
	id int8 GENERATED ALWAYS AS IDENTITY( INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START 1 CACHE 1 NO CYCLE) NOT NULL,
	"data" jsonb NOT NULL,
	updated_at timestamptz DEFAULT now() NULL,
	html text DEFAULT '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Document</title></head><body></body></html>'::text NOT NULL,
	"uuid" uuid DEFAULT gen_random_uuid() NOT NULL,
	"domain" varchar(250) NULL,
	"name" varchar(250) NULL,
	description text NULL,
	user_id uuid NULL,
	proxy_uuid uuid NULL,
	status varchar(100) NULL,
	CONSTRAINT pages_pk PRIMARY KEY (id),
	CONSTRAINT websites_unique UNIQUE (uuid),
	CONSTRAINT websites_unique_1 UNIQUE (domain)
);